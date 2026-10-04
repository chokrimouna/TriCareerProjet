from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def calculate_similarity(job_embedding, cv_embedding):

    similarity = cosine_similarity(
        [job_embedding],
        [cv_embedding]
    )[0][0]

    return round(float(similarity) * 100, 2)